"use strict";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const events = require('events');

const BASE = path.join(__dirname, 'files');

/*
[
  {
    num: <Chapter num>
    title: "<Chapter title>""
    questions: [{
      n: <Question num>,
      q: "<Question text>",
      o: [
        { id: "a|b|c|d", t: "<Answer text>" }
      ],
      a: "a|b|c|d"
    }] 
  }
]
*/



function newChapter(num, title) {
  return { num, title, questions: [] };
};

function newQuestion(n, q) {
  return { n, q, o: [], a: null };
};

function newQuestionOption(id, t) {
  return { id, t };
}

async function readChapters() {
  const file_in = path.join(BASE, "titulos.txt");
  const regex = /^Tema ([0-9]+)\. (.*)$/;
  const r = [];
  const rl = readline.createInterface({input: fs.createReadStream(file_in)});
  let lnum = 1;
  rl.on('line', line => {
    if (lnum === 1) line = maybeRemoveBOM(line); 
    const m = line.match(regex);
    if (m == null) throw new Error(`Invalid chapter line: [${line}]`);
    if (isNaN(Number(m[1]))) throw new Error(`Invalid chapter num: ${m[1]}`);
    r.push(newChapter(Number(m[1]), m[2]));
    lnum++;
  })
  await events.once(rl, 'close');
  return r;
}

async function fillQuestions(chapter) {
  const file_in = path.join(BASE, `preguntas-${chapter.num}.txt`);
  const regex_q = /^([0-9]+)\. (.*)$/;
  const regex_a = /^([a-z]+)\) (.*)$/
  let curr_q = null;
  let m;
  let lnum = 1;
  const rl = readline.createInterface({
    input: fs.createReadStream(file_in, {encoding: "utf8"})});
  rl.on('line', line => {
    if (lnum === 1) line = maybeRemoveBOM(line);
    if (line.trim() === "") {
      curr_q = null;
    } else if ((m = line.match(regex_a)) != null) {
      if (curr_q == null)
        throw new Error(`Unexpected answer line: ${line}`);
      curr_q.o.push(newQuestionOption(m[1], m[2]));
    } else if ((m = line.match(regex_q) != null)) {
      if (curr_q != null)
        throw new Error(`Unexpected question line: ${line}`);
      curr_q = newQuestion(Number(m[1]), m[2]);
      chapter.questions.push(curr_q);
    } else {
      throw new Error(`Unexpected line: ${line}`);
    }
    lnum++;
  });
  await events.once(rl, 'close');
}

function fillAnswers(chapter) {

}

function maybeRemoveBOM(line) {
  return line.replace(/^\uFEFF/, '');
}

(async function() {
  const chapters = await readChapters();
  for (const chapter of chapters) {
    await fillQuestions(chapter);
    fillAnswers(chapter);
  }
  console.log(JSON.stringify(chapters, null, 4));
})();