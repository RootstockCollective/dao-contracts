const fs = require('fs-extra')
const json = require('./jsons/beta-builders.json')

json.forEach((obj, i) => {
  fs.writeFileSync(__dirname + '/jsons/' + (i + 1) + '.json', JSON.stringify(obj))
})

console.log('done')
