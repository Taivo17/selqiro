'use strict';
const assert = require('node:assert/strict'), ts = require('typescript'), vm = require('node:vm');

function handlerSource(source, file, name) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(parsed) === name) found.push(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  assert.equal(found.length, 1, 'One actual page save handler');
  assert.ok(found[0] && ts.isArrowFunction(found[0]));
  return ts.transpileModule(`const legacyHandler = ${found[0].getText(parsed)}; legacyHandler;`, {
    fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.None },
  }).outputText;
}

function bindHandler(source, file, name, context) {
  return vm.runInNewContext(handlerSource(source, file, name), context, { filename: file, timeout: 2000 });
}
module.exports = { handlerSource, bindHandler };
