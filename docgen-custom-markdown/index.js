const path = require('path');
const fs = require('fs');

const dcmExtend = require('../docgen-custom-markdown-extend.js');


function processBuildInfo(source, name, data) {

  const { abi, devdoc = {}, userdoc = {} } = data.output.contracts[source][name];

  const { title, author, details } = devdoc;
  const { notice } = userdoc;

  const hardcodeContructorParamsDescription = devdoc['methods']['constructor'];

  // derive external signatures from internal types

  const getSigType = function ({ type, components = [] }) {
    return type.replace('tuple', `(${components.map(getSigType).join(',')})`);
  };

  const members = abi.reduce((acc, el) => {
    // constructor, fallback, and receive do not have names
    const name =
      el.name || (el.type === 'constructor' ? 'contractConstructor' : el.type);
    const inputs = el.inputs || [];
    const sig = `${name}(${inputs.map(getSigType)})`;
    acc[sig] = {
      ...el,
      signature: sig,
      ...(devdoc.events && devdoc.events[sig] ? devdoc.events[sig] : {}),
      ...(devdoc.methods && devdoc.methods[sig] ? devdoc.methods[sig] : {}),
      ...(devdoc.stateVariables && devdoc.stateVariables[name]
        ? {
          ...devdoc.stateVariables[name],
          type: 'stateVariable',
          returns: { _0: devdoc.stateVariables[name]['return'] },
        }
        : {}),
      ...(userdoc.methods && userdoc.methods[sig] ? userdoc.methods[sig] : {}),
      ...(userdoc.events && userdoc.events[sig] ? userdoc.events[sig] : {}),
      ...(el.type === 'constructor' ? { type: 'contractConstructor' } : {}),
    };
    return acc;
  }, {});
  const membersByType = Object.keys(members).reduce((acc, sig) => {
    const { type } = members[sig];
    acc[type] = acc[type] || {};
    acc[type][sig] = members[sig];
    return acc;
  }, {});

  return {
    // metadata
    source,
    name,
    // top-level docs
    title,
    author,
    details,
    notice,
    // Members
    membersByType,
    hardcodeContructorParamsDescription,
    devdoc,
    userdoc,
  };
}

const titleNoticeDetailsAuthor = (obj) => [

  obj.title && [`> Title: ${obj.title}`, ''],
  obj.notice && [`> Notice: ${obj.notice}`, ''],
  obj.details && [`> Details: ${obj.details}`, ''],
  obj.author && [`> Author: ${obj.author}`, ''],
];

const titleNoticeMethodDetailsAuthor = (obj, additionally) => [
  obj.notice && [`> Notice: ${obj.notice}`, ''],
 
  obj.details && [`> Details: ${obj.details}`, ''],
  !obj.details && (
    typeof(additionally.fix[obj.name]) !== 'undefined' &&
    typeof(additionally.fix[obj.name]["custom:shortd"]) !== 'undefined'
  ) && [`> Details: ${additionally.fix[obj.name]["custom:shortd"] }`, ''],

];

const renderAttrs = (member) => [
  (member.payable || member.stateMutability === 'payable') && 'payable',
  (member.constant || member.stateMutability === 'constant') && 'constant',
  (member.view || member.stateMutability === 'view') && 'view',
  (member.anonymous || member.stateMutability === 'anonymous') && 'anonymous',
];
const renderArgumentList = (inputs) => inputs.map((i) => i.name).join(', ');

const description = (entry, params, idx) =>
  params &&
  (entry.name.length === 0 && params['_' + idx]
    ? params['_' + idx]
    : params[entry.name]
    );

const renderTable = (type, entry, params) => [
  '| **name** | **type** | **description** |',
  '|-|-|-|',
  entry.map(
    (e, idx) =>
      '| ' +
      [
        (e.name == '') ? '-/-' : e.name,
        `${e.type}`,
        type === 'event'
          ? e.indexed
            ? 'indexed'
            : 'not indexed'
          : (description(e, params, idx)),
      ].join(' | ') +
      ' |'
  ),
  '',
];
const renderStateVariableTable = (type, entry, params) => [
  '| **type** |',
  '|-|',
  
  entry.map(
    (e, idx) =>
      '|'+e.type+'|'
  ),
  '',
];

const renderMembers = (p, name, members, info) => {
  if (members && Object.keys(members).length > 0) {
    output = [

      //(p !== 'contractConstructor') ? `## ${p}` : `## *constructor*`,
      `## *${p}*`,
    ...Object.values(members).filter(function(m) {
        if (additionally.exclude.indexOf(m.name) !== -1  || (m.name+'').substring(0,4) == 'c_0x') {
          return false; // skip
        }
        return true;
      }).map(function(m) { return [
      m.type === 'contractConstructor'
        ? [
          '',
          //`***constructor(${renderArgumentList(m.inputs || [])})***`,
          // `***${name}.${m.name}(${renderArgumentList(
          //   m.inputs || []
          // )})${renderAttrs(m).filter((x) => x)}***`,
        ]
        : [
          `### ${m.name}`,
          //'',
          // `***(${renderArgumentList(
          //   m.inputs || []
          // )})${renderAttrs(m).filter((x) => x)}***`,
        ],
      '',
      titleNoticeMethodDetailsAuthor(m,additionally),
  
      (
          m.inputs &&
          m.inputs.length > 0
      ) && [
        'Arguments',
        '',
        renderTable(
          m.type, 
          m.inputs, 
          //((m.type === 'contractConstructor') ? info.hardcodeContructorParamsDescription.params : m.params)
          ((m.type === 'contractConstructor') ? info.devdoc['methods']['constructor'].params : m.params)
        ),
      ],
      (
        m.type !== 'stateVariable' &&
        m.outputs &&
        m.outputs.length > 0 && [
          'Outputs',
          '',
          renderTable(m.type, m.outputs, m.returns),
        ]
      ),
      (
        m.type === 'stateVariable' &&
        m.outputs &&
        m.outputs.length > 0 && [
          '',
          renderStateVariableTable(m.type, m.outputs, m.params),
        ]
      ),
      '',
      '',
    ]
    }
    )];
    } else {
      output = [];
    }
    return output;
  };

// k - tagname
// m - obj
// d - default
const smartView = (k,m,d) => {
  d = (typeof(d) === 'undefined') ? '' : d;
  return (
    (typeof(additionally.fix[m.name]) === 'undefined' || typeof(additionally.fix[m.name][k]) === 'undefined')
    ?
    (typeof(m[k]) === 'undefined'? d : m[k])
    :
    additionally.fix[m.name][k]
  )
}
const renderOverview = (members) => [
  
  '| **method name** | **called by** | **description** |',
  '|-|-|-|',
  members &&
  Object.keys(members).length > 0 &&
  Object.values(members).filter(function(m) {
    if (additionally.exclude.indexOf(m.name) !== -1 || (m.name+'').substring(0,4) == 'c_0x') {
      return false; // skip
    }
    return true;
  }).map((m) => [
    m.type === 'contractConstructor'
      ? [
        `<a href="#сonstructor">сonstructor</a>`,
        '',
        '',
        //`***constructor(${renderArgumentList(m.inputs || [])})***`,
      ].join('|')
      : '|'+[
        `<a href="#${m.name.toLowerCase()}">${m.name}</a>`,
        smartView("custom:calledby", m, "everyone"),
        smartView("custom:shortd", m),
        // `***${name}.${m.name}(${renderArgumentList(
        //   m.inputs || []
        // )})${renderAttrs(m).filter((x) => x)}***`,
      ].join('|')+'|',
  ])
];
function renderContract(source, name, info) {
  const printOrder = [
    {name:'contractConstructor', title:'Constructor'},
    {name:'receive()', title:'receive()'},
    {name:'fallback()', title:'fallback()'},
    {name:'event', title:'Events'},
    {name:'stateVariable', title:'StateVariables'},
    {name:'function', title:'Functions'}
  ];
  
  const output = [
    `# ${name}`,
    '',
    additionally.description ? `${additionally.description}` : `${source}`,
    '',
    titleNoticeDetailsAuthor(info),
    `# Overview`,
    '',
    'Once installed will be use methods:',
    '',
    renderOverview(info.membersByType['function']),
    ...printOrder.map((p) => renderMembers(p.title, name, info.membersByType[p.name], info)),
  ];
  return output
    .flat(Infinity)
    .filter((x) => x === '' || x)
    .join('\n');
}


var additionally;

module.exports = async function (outputDirectory, data) {

  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  let dcmExtendData = dcmExtend();

  for (const c in data) {
    
    const [sourceFileName, contractName] = c.split(':');

    additionally = (typeof(dcmExtendData[sourceFileName]) === 'undefined' || Object.keys(dcmExtendData[sourceFileName]).length === 0) ? {'exclude':[],'fix':{}} : dcmExtendData[sourceFileName];

    const buildInfo = processBuildInfo(sourceFileName, contractName, data[c]);

    const text = renderContract(sourceFileName, contractName, buildInfo);
    const dirName = path.join(outputDirectory, path.dirname(sourceFileName));
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName, { recursive: true });
    }
    const fileName = path.basename(contractName, path.extname(contractName));
    fs.writeFileSync(
      path.join(dirName, fileName + '.md'),
      text
    );
  }
};
