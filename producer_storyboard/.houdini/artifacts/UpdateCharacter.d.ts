export type UpdateCharacter = {
    readonly "input": UpdateCharacter$input;
    readonly "result": UpdateCharacter$result;
};

export type UpdateCharacter$result = {
    readonly updateCharacter: {
        readonly id: string;
        readonly projectId: string;
        readonly name: string;
        readonly description: string | null;
        readonly personality: string | null;
        readonly background: string | null;
        readonly defaultHumeVoiceId: string | null;
        readonly profileImageId: string | null;
        readonly assets: ({
            readonly id: string;
            readonly characterId: string;
            readonly assetType: string;
            readonly assetFormat: string | null;
            readonly createdAt: string;
            readonly updatedAt: string;
        })[];
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type UpdateCharacterInput = {
    id: string | number;
    name?: string | null | undefined;
    description?: string | null | undefined;
    personality?: string | null | undefined;
    background?: string | null | undefined;
    defaultHumeVoiceId?: string | null | undefined;
    profileImageId?: string | number | null | undefined;
};

export type UpdateCharacter$input = {
    input: UpdateCharacterInput;
};

export type UpdateCharacter$optimistic = {
    readonly updateCharacter?: {
        readonly id?: string;
        readonly projectId?: string;
        readonly name?: string;
        readonly description?: string | null;
        readonly personality?: string | null;
        readonly background?: string | null;
        readonly defaultHumeVoiceId?: string | null;
        readonly profileImageId?: string | null;
        readonly assets?: ({
            readonly id?: string;
            readonly characterId?: string;
            readonly assetType?: string;
            readonly assetFormat?: string | null;
            readonly createdAt?: string;
            readonly updatedAt?: string;
        })[];
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type UpdateCharacter$artifact = {
    "name": "UpdateCharacter";
    "kind": "HoudiniMutation";
    "hash": "b1d73f746961fa65d2ea5122c3fdeaf0f627645d2c755ec932ea1f572c28b3b8";
    "raw": `mutation UpdateCharacter($input: UpdateCharacterInput!) {
  updateCharacter(input: $input) {
    id
    projectId
    name
    description
    personality
    background
    defaultHumeVoiceId
    profileImageId
    assets {
      id
      characterId
      assetType
      assetFormat
      createdAt
      updatedAt
    }
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "updateCharacter": {
                "type": "Character";
                "keyRaw": "updateCharacter(input: $input)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "projectId": {
                            "type": "ID";
                            "keyRaw": "projectId";
                            "visible": true;
                        };
                        "name": {
                            "type": "String";
                            "keyRaw": "name";
                            "visible": true;
                        };
                        "description": {
                            "type": "String";
                            "keyRaw": "description";
                            "nullable": true;
                            "visible": true;
                        };
                        "personality": {
                            "type": "String";
                            "keyRaw": "personality";
                            "nullable": true;
                            "visible": true;
                        };
                        "background": {
                            "type": "String";
                            "keyRaw": "background";
                            "nullable": true;
                            "visible": true;
                        };
                        "defaultHumeVoiceId": {
                            "type": "String";
                            "keyRaw": "defaultHumeVoiceId";
                            "nullable": true;
                            "visible": true;
                        };
                        "profileImageId": {
                            "type": "ID";
                            "keyRaw": "profileImageId";
                            "nullable": true;
                            "visible": true;
                        };
                        "assets": {
                            "type": "CharacterAsset";
                            "keyRaw": "assets";
                            "selection": {
                                "fields": {
                                    "id": {
                                        "type": "ID";
                                        "keyRaw": "id";
                                        "visible": true;
                                    };
                                    "characterId": {
                                        "type": "ID";
                                        "keyRaw": "characterId";
                                        "visible": true;
                                    };
                                    "assetType": {
                                        "type": "String";
                                        "keyRaw": "assetType";
                                        "visible": true;
                                    };
                                    "assetFormat": {
                                        "type": "String";
                                        "keyRaw": "assetFormat";
                                        "nullable": true;
                                        "visible": true;
                                    };
                                    "createdAt": {
                                        "type": "String";
                                        "keyRaw": "createdAt";
                                        "visible": true;
                                    };
                                    "updatedAt": {
                                        "type": "String";
                                        "keyRaw": "updatedAt";
                                        "visible": true;
                                    };
                                };
                            };
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                        "updatedAt": {
                            "type": "String";
                            "keyRaw": "updatedAt";
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "input": "UpdateCharacterInput";
        };
        "types": {
            "UpdateCharacterInput": {
                "id": "ID";
                "name": "String";
                "description": "String";
                "personality": "String";
                "background": "String";
                "defaultHumeVoiceId": "String";
                "profileImageId": "ID";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};