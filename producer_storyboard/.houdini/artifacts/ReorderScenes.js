export default {
    "name": "ReorderScenes",
    "kind": "HoudiniMutation",
    "hash": "12994559694876962a3784c4cc8090f745ce0b46eea3002ef77491941337e574",

    "raw": `mutation ReorderScenes($input: ReorderScenesInput!) {
  reorderScenes(input: $input) {
    id
    storyboardId
    sceneNumber
    textDescription
    startTimeSeconds
    durationSeconds
    transitionType
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "reorderScenes": {
                "type": "Scene",
                "keyRaw": "reorderScenes(input: $input)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "storyboardId": {
                            "type": "ID",
                            "keyRaw": "storyboardId",
                            "visible": true
                        },

                        "sceneNumber": {
                            "type": "Int",
                            "keyRaw": "sceneNumber",
                            "visible": true
                        },

                        "textDescription": {
                            "type": "String",
                            "keyRaw": "textDescription",
                            "nullable": true,
                            "visible": true
                        },

                        "startTimeSeconds": {
                            "type": "Float",
                            "keyRaw": "startTimeSeconds",
                            "nullable": true,
                            "visible": true
                        },

                        "durationSeconds": {
                            "type": "Float",
                            "keyRaw": "durationSeconds",
                            "nullable": true,
                            "visible": true
                        },

                        "transitionType": {
                            "type": "String",
                            "keyRaw": "transitionType",
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
            "input": "ReorderScenesInput"
        },

        "types": {
            "ReorderScenesInput": {
                "storyboardId": "ID",
                "sceneIds": "ID"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=62e0ad4c65a728b5e16c116116ada2597ae473c0e8ebc612f40ce602d7e673da";