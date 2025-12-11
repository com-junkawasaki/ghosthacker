export default {
    "name": "CreateProject",
    "kind": "HoudiniMutation",
    "hash": "08691cfa5747103ac5633b1d5633c875dd9ea223d6a4d625f159bebd50ae56cb",

    "raw": `mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
    orgId
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
            "createProject": {
                "type": "Project",
                "keyRaw": "createProject(input: $input)",

                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID",
                            "keyRaw": "id",
                            "visible": true
                        },

                        "orgId": {
                            "type": "ID",
                            "keyRaw": "orgId",
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
            "input": "CreateProjectInput"
        },

        "types": {
            "CreateProjectInput": {
                "orgId": "ID",
                "title": "String",
                "description": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=d6bebc95990c2428fff9995057cd8c31443fe2b95465a5a1b3591c0af82f0199";