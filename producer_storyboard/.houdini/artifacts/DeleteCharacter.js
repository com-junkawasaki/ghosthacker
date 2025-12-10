export default {
    "name": "DeleteCharacter",
    "kind": "HoudiniMutation",
    "hash": "2bf60afe9425b1608482eee2ea5062f0faaedc65f0704dd738dbace8f770bd1d",

    "raw": `mutation DeleteCharacter($id: ID!) {
  deleteCharacter(id: $id)
}`,

    "rootType": "Mutation",
    "stripVariables": [],

    "selection": {
        "fields": {
            "deleteCharacter": {
                "type": "Boolean",
                "keyRaw": "deleteCharacter(id: $id)",
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

"HoudiniHash=7c799ba3b3d3d4ae94c6a6556abb742456c99c98d4f15215130df43dc10dda50";