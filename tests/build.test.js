import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BUILD } from "../js/build.js";

test("배포 버전: index.html 과 js/build.js 가 같은 값이다", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const meta = html.match(/<meta name="build" content="([^"]+)">/);
  assert.ok(meta, 'index.html 에 <meta name="build"> 가 있어야 한다');
  assert.equal(meta[1], BUILD, "파일을 고쳐 올릴 때는 두 곳의 버전을 같이 올린다");
});

test("배포 버전: README 의 업데이트에 이번 버전의 수정 사항이 있다", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const updates = readme.split(/^## 업데이트$/m)[1];
  assert.ok(updates, 'README 맨 아래에 "## 업데이트" 가 있어야 한다');
  assert.ok(updates.includes(`### ${BUILD}\n`), `README 업데이트에 "### ${BUILD}" 항목을 적는다`);
});
