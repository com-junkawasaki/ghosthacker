export default {
    "name": "ListAudioClips",
    "kind": "HoudiniQuery",
    "hash": "c9c2b768ccb3c8632c015919d88f2bee6390caa7a1936089c3344411a9bc6515",

    "raw": `query ListAudioClips($trackId: ID!) {
  audioClips(trackId: $trackId) {
    id
    trackId
    startTimeSeconds
    durationSeconds
    audioType
    audioUrl
    audioDataId
    metadata
    createdAt
    updatedAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "audioClips": {
                "type": "AudioClip",
                "keyRaw": "audioClips(trackId: $trackId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "trackId": {
                            "type": "ID",
                            "keyRaw": "trackId",
                            "visible": true
                        },

                        "startTimeSeconds": {
                            "type": "Float",
                            "keyRaw": "startTimeSeconds",
                            "visible": true
                        },

                        "durationSeconds": {
                            "type": "Float",
                            "keyRaw": "durationSeconds",
                            "visible": true
                        },

                        "audioType": {
                            "type": "String",
                            "keyRaw": "audioType",
                            "visible": true
                        },

                        "audioUrl": {
                            "type": "String",
                            "keyRaw": "audioUrl",
                            "nullable": true,
                            "visible": true
                        },

                        "audioDataId": {
                            "type": "ID",
                            "keyRaw": "audioDataId",
                            "nullable": true,
                            "visible": true
                        },

                        "metadata": {
                            "type": "String",
                            "keyRaw": "metadata",
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
            "trackId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=a9ad744feceb861562171a9781c5be6df6a525622e30abe0651787d3e48a3c9a";