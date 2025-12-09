export default {
    "name": "CreateCharacter",
    "kind": "HoudiniMutation",
    "hash": "1022e3b236d77a8d0d716223eaa9fe7b1e021a0fc0afec08ab8e607781c1618a",

    "raw": `mutation CreateCharacter($input: CreateCharacterInput!) {
  createCharacter(input: $input) {
    id
    projectId
    name
    description
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
                "description": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=738cd4a3cb62979056a08abf767aa2d39135a1f51bd939581cdac8fba162766f";