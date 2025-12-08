export default {
    "name": "ListStoryboards",
    "kind": "HoudiniQuery",
    "hash": "8b7c4bbab0baacb523303342889bbb66db74d807cf8e03bff06aeb4f8c9a4927",

    "raw": `query ListStoryboards($projectId: ID!) {
  storyboards(projectId: $projectId) {
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

    "rootType": "Query",
    "stripVariables": [],

    "selection": {
        "fields": {
            "storyboards": {
                "type": "Storyboard",
                "keyRaw": "storyboards(projectId: $projectId)",

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
            "projectId": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    },

    "policy": "CacheOrNetwork",
    "partial": false
};

"HoudiniHash=bc7a8884c0531a8efd34c73da15811cba545bd418b4ab77609321d33f0f1a8f7";