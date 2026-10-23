/**
 * Host-agnostic bootstrap for the gnubg Emscripten module. The host (worker
 * or node test harness) evaluates the vendored `gnubg.js` glue with
 * `moduleConfig` installed as `Module`; this file owns everything the glue
 * needs injected — output capture, auto-confirming stdin, lifecycle — and
 * exposes the synchronous command channel once the runtime is up.
 */

import type { RunCommand } from './session';

/** The subset of the Emscripten module surface the command channel uses. */
interface GnubgEmscriptenModule {
  _start(): void;
  _run_command(pointer: number): void;
  _malloc(size: number): number;
  setValue(pointer: number, value: number, type: 'i8'): void;
}

export interface GnubgBootOptions {
  /** Resolve `gnubg.wasm` / `gnubg.data` URLs (browser hosts). */
  readonly locateFile?: (path: string) => string;
  /** Pre-fetched wasm bytes (node hosts, bypasses network). */
  readonly wasmBinary?: Uint8Array;
  /** Pre-fetched data package (node hosts, bypasses XHR). */
  readonly getPreloadedPackage?: (
    name: string,
    size: number,
  ) => ArrayBuffer;
}

export interface GnubgBoot {
  /** Assign to `globalThis.Module` before evaluating the glue source. */
  readonly moduleConfig: Record<string, unknown>;
  /** Resolves to the command channel once gnubg has started. */
  readonly ready: Promise<RunCommand>;
}

const COMMAND_BUFFER_SIZE = 4096;

export function createGnubgBoot(options: GnubgBootOptions = {}): GnubgBoot {
  let lines: string[] = [];
  let stdinPending = '';
  let stdinIndex = 0;

  /**
   * gnubg's occasional interactive prompts (GetInputYN) read stdin; answer
   * "y" to each so the engine can never hang the host.
   */
  const stdin = (): number | null => {
    if (stdinIndex >= stdinPending.length) {
      if (stdinPending === '') {
        stdinPending = 'y\n';
        stdinIndex = 0;
      } else {
        stdinPending = '';
        stdinIndex = 0;
        return null;
      }
    }
    return stdinPending.charCodeAt(stdinIndex++);
  };

  let resolveReady: (run: RunCommand) => void;
  let rejectReady: (error: Error) => void;
  const ready = new Promise<RunCommand>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  const moduleConfig: Record<string, unknown> = {
    print: (line: string) => {
      lines.push(line);
    },
    printErr: (line: string) => {
      lines.push(line);
    },
    stdin,
    onRuntimeInitialized: () => {
      try {
        const module = moduleConfig as unknown as GnubgEmscriptenModule;
        module._start();
        let commandBuffer = 0;
        const runCommand: RunCommand = (command: string) => {
          lines = [];
          if (!commandBuffer) {
            commandBuffer = module._malloc(COMMAND_BUFFER_SIZE);
          }
          const length = Math.min(command.length, COMMAND_BUFFER_SIZE - 1);
          for (let i = 0; i < length; i++) {
            module.setValue(
              commandBuffer + i,
              command.charCodeAt(i) & 0x7f,
              'i8',
            );
          }
          module.setValue(commandBuffer + length, 0, 'i8');
          module._run_command(commandBuffer);
          return lines;
        };
        resolveReady(runCommand);
      } catch (error) {
        rejectReady(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    },
    onAbort: (reason: unknown) => {
      rejectReady(new Error(`gnubg aborted: ${String(reason)}`));
    },
  };

  if (options.locateFile) {
    moduleConfig.locateFile = options.locateFile;
  }
  if (options.wasmBinary) {
    moduleConfig.wasmBinary = options.wasmBinary;
  }
  if (options.getPreloadedPackage) {
    moduleConfig.getPreloadedPackage = options.getPreloadedPackage;
  }

  return { moduleConfig, ready };
}
