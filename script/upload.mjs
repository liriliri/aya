#!/usr/bin/env zx
import {
  S3Client,
  PutObjectCommand,
  ListObjectsCommand,
} from '@aws-sdk/client-s3'
import each from 'licia/each.js'
import isWindows from 'licia/isWindows.js'

const pkg = await fs.readJson('package.json')
const version = pkg.version

const Bucket = 'release'

const client = new S3Client({
  region: 'auto',
  endpoint: 'https://69bad68bc4f1ee411b4d6c55ecb590be.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.RELEASE_ACCESS_KEY_ID,
    secretAccessKey: process.env.RELEASE_SECRET_ACCESS_KEY,
  },
})

let Key = `AYA-${version}-mac-arm64.dmg`
if (isWindows) {
  Key = `AYA-${version}-win-x64.exe`
}

const listObjects = new ListObjectsCommand({
  Bucket,
})

const { Contents } = await client.send(listObjects)

let fileExists = false
each(Contents, (content) => {
  if (content.Key === Key) {
    fileExists = true
  }
})

if (fileExists) {
  console.log(`${Key} exists`)
} else {
  console.log(`upload ${Key}`)
  const filePath = `release/${version}/${Key}`
  const Body = fs.createReadStream(filePath)
  const putObject = new PutObjectCommand({
    Bucket,
    Key,
    Body,
  })
  await client.send(putObject)
}
