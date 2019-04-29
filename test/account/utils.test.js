import { uploadProfile } from '../../app/js/account/utils'
import { ECPair, address as bjsAddress, crypto } from 'bitcoinjs-lib'
import { BitcoinKeyPairs } from '../fixtures/bitcoin'
import nock from 'nock'

const mockHubInfoResponse = {
  challenge_text: '["gaiahub","2018","storage.blockstack.org","blockstack_storage_please_sign"]',
  read_url_prefix: 'https://gaia.blockstack.org/hub/'
}

const globalAPIConfig = {
  gaiaHubConfig: {
    address: '15GAGiT2j2F1EzZrvjk3B8vBCfwVEzQaZx',
    server: 'https://hub.blockstack.org',
    token: 'dummy-token',
    url_prefix: 'https://gaia.blockstack.org/hub/'
  },
  gaiaHubUrl: 'https://hub.blockstack.org'
}

function ecPairToAddress(keyPair) {
  return bjsAddress.toBase58Check(crypto.hash160(keyPair.publicKey), keyPair.network.pubKeyHash)
}

describe('upload-profile', () => {
  beforeEach(() => {
    nock('https://hub.blockstack.org')
      .get('/hub_info')
      .reply(200, mockHubInfoResponse)
  })

  afterEach(() => {})

  describe('uploadProfile', () => {

    // TODO: fix this test
    it.skip('should upload to the zonefile entry, using the global uploader if necessary', async () => {
      const ecPair = ECPair.fromWIF(BitcoinKeyPairs.test1.wif)
      const address = ecPairToAddress(ecPair)
      const key = ecPair.privateKey.toString('hex')
      const keyPair = {
        address,
        key
      }

      const hubAddress = globalAPIConfig.gaiaHubConfig.address

      const mockResponseBody = {
        publicURL: `https://gaia.blockstack.org/hub/${hubAddress}/foo-profile.json`
      }

      // mock gaia hub
      nock('https://hub.blockstack.org')
        .post(`/store/${hubAddress}/foo-profile.json`)
        .reply(200, mockResponseBody)

      const zoneFile = '$ORIGIN satoshi.id\n$TTL 3600\n_http._tcp\tIN\tURI\t10\t1\t' +
            `"https://gaia.blockstack.org/hub/${hubAddress}/foo-profile.json"\n\n`

      const identity = { zoneFile }

      const x = await uploadProfile(globalAPIConfig, identity, keyPair, 'test-data')
      assert.equal('https://gaia.blockstack.org/hub/15GAGiT2j2F1EzZrvjk3B8vBCfwVEzQaZx/foo-profile.json', x)
    })

    it('should upload to the default entry location if no zonefile', async () => {
      const ecPair = ECPair.fromWIF(BitcoinKeyPairs.test1.wif)
      const address = ecPairToAddress(ecPair)
      const key = ecPair.privateKey.toString('hex')
      const keyPair = {
        address,
        key
      }

      const mockResponseBody = {
        publicURL: `https://gaia.blockstack.org/hub/${address}/profile.json`
      }

      // mock gaia hub
      nock('https://hub.blockstack.org')
        .post(`/store/${address}/profile.json`)
        .reply(200, mockResponseBody)

      const identity = {}

      const x = await uploadProfile(globalAPIConfig, identity, keyPair, 'test-data')
      assert.equal(`https://gaia.blockstack.org/hub/${address}/profile.json`, x)
    })

    it('should log an error and upload to the default if it cannot write to where the zonefile points', () => {
      const ecPair = ECPair.fromWIF(BitcoinKeyPairs.test1.wif)
      const address = ecPairToAddress(ecPair)
      const key = ecPair.privateKey.toString('hex')
      const keyPair = {
        address,
        key
      }

      const mockResponseBody = {
        publicURL: `https://gaia.blockstack.org/hub/${address}/profile.json`
      }

      // mock gaia hub
      nock('https://hub.blockstack.org')
        .post(`/store/${address}/profile.json`)
        .reply(200, mockResponseBody)

      const zoneFile = '$ORIGIN satoshi.id\n$TTL 3600\n_http._tcp\tIN\tURI\t10\t1\t' +
            `"https://potato.blockstack.org/hub/${address}/foo-profile.json"\n\n`

      const identity = { zoneFile }

      uploadProfile(globalAPIConfig, identity, keyPair, 'test-data')
        .then(x => assert.equal(
          `https://gaia.blockstack.org/hub/${address}/profile.json`, x))
        .catch(() => assert.fail())
    })
  })
})
