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

"HoudiniHash=8cc700c8541c6c57a0aad1fdd8a1691bd25d5b1013f828be590c89c65042751d";