/**
 * The glob import the test runner's build carries.
 *
 * The build rewrites a literal `import.meta.glob` call into a record of module
 * loaders before the code runs, so the call has to stay literal and the type
 * checker has nothing to read it from. Naming the shape here keeps the checker
 * over the two suites that load every screen and every route handler, and
 * keeps each loaded module typed rather than falling to `unknown`.
 */
interface ImportMeta {
  glob(pattern: string | string[]): Record<string, () => Promise<Record<string, unknown>>>;
}
