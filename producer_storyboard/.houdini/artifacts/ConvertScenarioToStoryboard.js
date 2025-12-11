export default {
    "name": "ConvertScenarioToStoryboard",
    "kind": "HoudiniMutation",
    "hash": "e31603e311512f4109c5daa5f413fc857e470a54fc15abc7326312a5fe64db23",

    "raw": `mutation ConvertScenarioToStoryboard($input: ConvertScenarioToStoryboardInput!) {
  convertScenarioToStoryboard(input: $input) {
    id
    projectId
    title
    aspectRatio
    resolution
    durationSeconds
    numVariations
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "convertScenarioToStoryboard": {
                "type": "Storyboard",
                "keyRaw": "convertScenarioToStoryboard(input: $input)",

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

                        "aspectRatio": {
                            "type": "String",
                            "keyRaw": "aspectRatio",
                            "visible": true
                        },

                        "resolution": {
                            "type": "String",
                            "keyRaw": "resolution",
                            "visible": true
                        },

                        "durationSeconds": {
                            "type": "Int",
                            "keyRaw": "durationSeconds",
                            "nullable": true,
                            "visible": true
                        },

                        "numVariations": {
                            "type": "Int",
                            "keyRaw": "numVariations",
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
            "input": "ConvertScenarioToStoryboardInput"
        },

        "types": {
            "ConvertScenarioToStoryboardInput": {
                "scenarioId": "ID",
                "storyboardTitle": "String",
                "aspectRatio": "String",
                "resolution": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=c2d98b15ae4053a53d9d3242a614155861792d2f8fc63497d9013b2d8a2e10c4";