export default {
    "name": "UpdateScenario",
    "kind": "HoudiniMutation",
    "hash": "0fc5d71efd8e66b28caa3f59690de6f39416b3f3db50026587e0858f9cdd77a9",

    "raw": `mutation UpdateScenario($input: UpdateScenarioInput!) {
  updateScenario(input: $input) {
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
            "updateScenario": {
                "type": "Scenario",
                "keyRaw": "updateScenario(input: $input)",

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
            "input": "UpdateScenarioInput"
        },

        "types": {
            "UpdateScenarioInput": {
                "id": "ID",
                "title": "String",
                "description": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=ece09cc672d359919f046f7f325d33ab9980ecbdd7187a108867c5c640cf3cd2";