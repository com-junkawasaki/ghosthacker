export default {
    "name": "ListAudioTracks",
    "kind": "HoudiniQuery",
    "hash": "9acef65000ba9dfca64fa9d003715b1d68e7801d62c84c2daa965293ac1b7696",

    "raw": `query ListAudioTracks($composerId: ID!) {
  audioTracks(composerId: $composerId) {
    id
    composerId
    trackNumber
    trackType
    name
    createdAt
    updatedAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "audioTracks": {
                "type": "AudioTrack",
                "keyRaw": "audioTracks(composerId: $composerId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "composerId": {
                            "type": "ID",
                            "keyRaw": "composerId",
                            "visible": true
                        },

                        "trackNumber": {
                            "type": "Int",
                            "keyRaw": "trackNumber",
                            "visible": true
                        },

                        "trackType": {
                            "type": "String",
                            "keyRaw": "trackType",
                            "visible": true
                        },

                        "name": {
                            "type": "String",
                            "keyRaw": "name",
                            "nullable": true,
                            "visible": true
                        },

                        "createdAt": {
                            "type": "String",
                            "keyRaw": "createdAt",
                            "visible": true
                        },

                        "updatedAt": {
                            "type": "String",
                            "keyRaw": "updatedAt",
                            "visible": true
                        }
                    }
                },

                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "composerId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=e876c186b8f0278631f9e56c60d2044abe4664fdcd5a20ae2263d88386c16d62";