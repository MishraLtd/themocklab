const fs = require('fs');

const cmdHtml = fs.readFileSync('The_Mock_Lab_Command_Center.html', 'utf8');
const iatHtml = fs.readFileSync('IATCalculator.html', 'utf8');

// Extract the script/style block from Command Center
const cmdStart = cmdHtml.indexOf('<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>');
const cmdEnd = cmdHtml.indexOf('</style>') + '</style>'.length;
const cmdBodyStart = cmdHtml.indexOf('<body');
const cmdBodyEnd = cmdHtml.indexOf('>', cmdBodyStart) + 1;

const newStyleBlock = cmdHtml.substring(cmdStart, cmdEnd);
const newBodyTag = cmdHtml.substring(cmdBodyStart, cmdBodyEnd);

// Replace in IATCalculator
const iatStart = iatHtml.indexOf('<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>');
const iatEnd = iatHtml.indexOf('</style>') + '</style>'.length;
const iatBodyStart = iatHtml.indexOf('<body');
const iatBodyEnd = iatHtml.indexOf('>', iatBodyStart) + 1;

let newIatHtml = iatHtml.substring(0, iatStart) + newStyleBlock + iatHtml.substring(iatEnd, iatBodyStart) + newBodyTag + iatHtml.substring(iatBodyEnd);

// Fix the typo "the_mock_lab_command_center.html" at line 185 if it exists
newIatHtml = newIatHtml.replace('</a>the_mock_lab_command_center.html', '</a>');

fs.writeFileSync('IATCalculator.html', newIatHtml, 'utf8');
console.log('Successfully copied styles from Command Center to IATCalculator.');
