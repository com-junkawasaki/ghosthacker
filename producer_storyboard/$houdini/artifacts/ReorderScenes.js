export default {
    "name": "ReorderScenes",
    "kind": "HoudiniMutation",
    "hash": "020714cd4c3857355d66b504f0d780980c7de495063c40205a9a013ec87ce557",

    "raw": `mutation ReorderScenes($input: ReorderScenesInput!) {
  reorderScenes(input: $input) {
    id
    storyboardId
    sceneNumber
    textDescription
    mediaType
    mediaUrl
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

                        "mediaType": {
                            "type": "String",
                            "keyRaw": "mediaType",
                            "nullable": true,
                            "visible": true
                        },

                        "mediaUrl": {
                            "type": "String",
                            "keyRaw": "mediaUrl",
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

"HoudiniHash=9e8127134682fe49dfd4fdf747493a43461e447c82c40f8a25519ecf0f7cbc00";