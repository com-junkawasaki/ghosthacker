export default {
    "name": "CreateComposer",
    "kind": "HoudiniMutation",
    "hash": "726ef731e690cca3d60f0ba13dc486f1e9eaf79bc7a81e6b2d9934bf11fadaa6",

    "raw": `mutation CreateComposer($input: CreateComposerInput!) {
  createComposer(input: $input) {
    id
    projectId
    title
    durationSeconds
    createdAt
    updatedAt
  }
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "createComposer": {
                "type": "Composer",
                "keyRaw": "createComposer(input: $input)",

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

                        "durationSeconds": {
                            "type": "Float",
                            "keyRaw": "durationSeconds",
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
            "input": "CreateComposerInput"
        },

        "types": {
            "CreateComposerInput": {
                "projectId": "ID",
                "title": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=2b06d69359380df04a364b67bf334551e23aa8610c63c010ba978b6b264d4b8b";