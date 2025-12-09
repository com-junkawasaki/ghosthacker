export default {
    "name": "ListCharacters",
    "kind": "HoudiniQuery",
    "hash": "73509539325e660c11611f7555ebab1b185ad2c210e5df4d39fb2e2ff6e4714c",

    "raw": `query ListCharacters($projectId: ID!) {
  characters(projectId: $projectId) {
    id
    projectId
    name
    description
    personality
    background
    defaultHumeVoiceId
    profileImageId
    assets {
      id
      characterId
      assetType
      assetFormat
      createdAt
      updatedAt
    }
    createdAt
    updatedAt
  }
}`,

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "characters": {
                "type": "Character",
                "keyRaw": "characters(projectId: $projectId)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "projectId": {
                            "type": "ID",
                            "keyRaw": "projectId",
                            "visible": true
                        },

                        "name": {
                            "type": "String",
                            "keyRaw": "name",
                            "visible": true
                        },

                        "description": {
                            "type": "String",
                            "keyRaw": "description",
                            "nullable": true,
                            "visible": true
                        },

                        "personality": {
                            "type": "String",
                            "keyRaw": "personality",
                            "nullable": true,
                            "visible": true
                        },

                        "background": {
                            "type": "String",
                            "keyRaw": "background",
                            "nullable": true,
                            "visible": true
                        },

                        "defaultHumeVoiceId": {
                            "type": "String",
                            "keyRaw": "defaultHumeVoiceId",
                            "nullable": true,
                            "visible": true
                        },

                        "profileImageId": {
                            "type": "ID",
                            "keyRaw": "profileImageId",
                            "nullable": true,
                            "visible": true
                        },

                        "assets": {
                            "type": "CharacterAsset",
                            "keyRaw": "assets",

                            "selection": {
                                "fields": {
                                    "id": {
                                        "type": "ID",
                                        "keyRaw": "id",
                                        "visible": true
                                    },

                                    "characterId": {
                                        "type": "ID",
                                        "keyRaw": "characterId",
                                        "visible": true
                                    },

                                    "assetType": {
                                        "type": "String",
                                        "keyRaw": "assetType",
                                        "visible": true
                                    },

                                    "assetFormat": {
                                        "type": "String",
                                        "keyRaw": "assetFormat",
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
            "projectId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=13ee1e02395a7b9e0b72e7fa5e6d10197d815073cce4dc401ea848595033f799";