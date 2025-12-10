export default {
    "name": "CreateAudioTrack",
    "kind": "HoudiniMutation",
    "hash": "94aedd7bde2dd57f069fbbf18b56b6a303834abc2e36f7164f727077707783b5",

    "raw": `mutation CreateAudioTrack($input: CreateAudioTrackInput!) {
  createAudioTrack(input: $input) {
    id
    composerId
    trackNumber
    trackType
    name
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "createAudioTrack": {
                "type": "AudioTrack",
                "keyRaw": "createAudioTrack(input: $input)",

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
            "input": "CreateAudioTrackInput"
        },

        "types": {
            "CreateAudioTrackInput": {
                "composerId": "ID",
                "trackNumber": "Int",
                "trackType": "String",
                "name": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=a05876f431a59819ca6757a4027cffe656b7f0f8a88bce7a2d77c53bb7706655";