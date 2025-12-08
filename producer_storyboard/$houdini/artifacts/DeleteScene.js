export default {
    "name": "DeleteScene",
    "kind": "HoudiniMutation",
    "hash": "7421a2eec5fbf6e2d29ca918aa010c47febdac17d9648ca0cfb2ac66351b33d6",

    "raw": `mutation DeleteScene($id: ID!) {
  deleteScene(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteScene": {
                "type": "Boolean",
                "keyRaw": "deleteScene(id: $id)",
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

"HoudiniHash=8705758422013261d005e4345d237052995f5351a8b77f4a4c309ffe5b492724";