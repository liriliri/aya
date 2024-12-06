const adb = require('@devicefarmer/adbkit').default
const isEmpty = require('licia/isEmpty')
const wire = require('../src/main/lib/wire.js')

async function main() {
  const client = adb.createClient()
  const devices = await client.listDevices()
  if (isEmpty(devices)) {
    return
  }
  const device = client.getDevice(devices[0].id)
  const connection = await device.openLocal('localabstract:aya')
  connection.write(
    wire.Request.encode({
      id: '1',
      method: 'getPackages',
    }).finish()
  )
}

main()
