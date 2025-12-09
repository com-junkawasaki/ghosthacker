export default {
    "name": "CreateCharacter",
    "kind": "HoudiniMutation",
    "hash": "cac47bbeae1fbaf48650271ca7011d94735241c3fd1d5058867cab0c1463a153",

    "raw": `mutation CreateCharacter($input: CreateCharacterInput!) {
  createCharacter(input: $input) {
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

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "createCharacter": {
                "type": "Character",
                "keyRaw": "createCharacter(input: $input)",

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
            "input": "CreateCharacterInput"
        },

        "types": {
            "CreateCharacterInput": {
                "projectId": "ID",
                "name": "String",
                "description": "String",
                "personality": "String",
                "background": "String",
                "defaultHumeVoiceId": "String",
                "profileImageId": "ID"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=c9fab540c5ba77b4d8be3735ef67a97bc9f0056af75036f767f951646577a3a5";