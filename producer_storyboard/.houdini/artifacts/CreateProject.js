export default {
    "name": "CreateProject",
    "kind": "HoudiniMutation",
    "hash": "875bfc962ac7788ab83986bcc34377628d9bb50d8fddc5f86b3ef6b49f286c94",

    "raw": `mutation CreateProject($input: CreateProjectInput!) {
  createProject(input: $input) {
    id
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
                "title": "String",
                "description": "String"
            }
        },

        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=7ccd4bd20af51b8a70321c58bf3cf9df498844c972a8dcffd7248ea38936e361";