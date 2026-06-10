#!/usr/bin/env node
// @ts-check
/**
 * @wiremark/cli — command-line renderer for wiremark.
 *
 *   npx @wiremark/cli <in.wiremark> [out.svg]    (also: -o out.svg)
 *
 * Thin wrapper over @wiremark/core's CLI runner; all rendering lives in core.
 */
import { run } from '@wiremark/core/cli';

run(process.argv.slice(2));
