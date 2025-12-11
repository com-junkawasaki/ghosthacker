export default {
    "name": "CreateScenario",
    "kind": "HoudiniMutation",
    "hash": "34cd1fb725452c2a91ada4995582af844197e0fd722f5472fa0b9f52fc53f5ba",

    "raw": `mutation CreateScenario($input: CreateScenarioInput!) {
  createScenario(input: $input) {
    id
    projectId
    title
    description
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "createScenario": {
                "type": "Scenario",
                "keyRaw": "createScenario(input: $input)",

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

                        "title": {
                            "type": "String",
                            "keyRaw": "title",
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
            "input": "CreateScenarioInput"
        },

        "types": {
            "CreateScenarioInput": {
                "projectId": "ID",
                "title": "String",
                "description": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=98a63324a03fe34c43e2deed0f72f473d32540c73a569c1bd580e9c8ce1bee2e";