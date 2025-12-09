export default {
    "name": "DeleteDialogue",
    "kind": "HoudiniMutation",
    "hash": "4f0d63dd47fd766e95aade6ccf67f8f6cca81f6e293f1bab8e324e002f15f918",

    "raw": `mutation DeleteDialogue($id: ID!) {
  deleteDialogue(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteDialogue": {
                "type": "Boolean",
                "keyRaw": "deleteDialogue(id: $id)",
                "visible": true
            }
        }
    },

    "pluginData": {
        "houdini-svelte": {}
    },

    "input": {
        "fields": {
            "id": "ID"
        },

        "types": {},
        "defaults": {},
        "runtimeScalars": {}
    }
};

"HoudiniHash=54d59367de514060fefe1aba4c85be238f616138e74b69e0b62611f3ab02d619";