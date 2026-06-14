const fs = require('fs');

const iatHtml = fs.readFileSync('IATCalculator.html', 'utf8');
const commandCenterHtml = fs.readFileSync('The_Mock_Lab_Command_Center.html', 'utf8');

// Extract everything from <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script> up to </style> in IATCalculator
const iatStart = iatHtml.indexOf('<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>');
const iatEnd = iatHtml.indexOf('</style>') + '</style>'.length;
const iatBodyStart = iatHtml.indexOf('<body');
const iatBodyEnd = iatHtml.indexOf('>', iatBodyStart) + 1;

const newStyleBlock = iatHtml.substring(iatStart, iatEnd);
const newBodyTag = iatHtml.substring(iatBodyStart, iatBodyEnd);

const cmdStart = commandCenterHtml.indexOf('<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>');
const cmdEnd = commandCenterHtml.indexOf('</style>') + '</style>'.length;
const cmdBodyStart = commandCenterHtml.indexOf('<body');
const cmdBodyEnd = commandCenterHtml.indexOf('>', cmdBodyStart) + 1;

let newCmdHtml = commandCenterHtml.substring(0, cmdStart) + newStyleBlock + commandCenterHtml.substring(cmdEnd, cmdBodyStart) + newBodyTag + commandCenterHtml.substring(cmdBodyEnd);

fs.writeFileSync('The_Mock_Lab_Command_Center.html', newCmdHtml, 'utf8');
console.log('Style replaced successfully.');
