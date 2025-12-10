export default {
    "name": "UpdateAudioClip",
    "kind": "HoudiniMutation",
    "hash": "402963906082bd853e95abd6676b59ce3e50164255cf6059b9706b27584c79a1",

    "raw": `mutation UpdateAudioClip($input: UpdateAudioClipInput!) {
  updateAudioClip(input: $input) {
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

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "updateAudioClip": {
                "type": "AudioClip",
                "keyRaw": "updateAudioClip(input: $input)",

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
            "input": "UpdateAudioClipInput"
        },

        "types": {
            "UpdateAudioClipInput": {
                "id": "ID",
                "startTimeSeconds": "Float",
                "durationSeconds": "Float",
                "trackId": "ID"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=62767abe106c8cdfa88e727cb31a6b43719b3938f1f7dea084513a60f9a77916";