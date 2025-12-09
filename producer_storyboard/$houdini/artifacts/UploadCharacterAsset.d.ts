export type UploadCharacterAsset = {
    readonly "input": UploadCharacterAsset$input;
    readonly "result": UploadCharacterAsset$result;
};

export type UploadCharacterAsset$result = {
    readonly uploadCharacterAsset: {
        readonly id: string;
        readonly characterId: string;
        readonly assetType: string;
        readonly assetFormat: string | null;
        readonly createdAt: string;
        readonly updatedAt: string;
    };
};

type UploadCharacterAssetInput = {
    characterId: string | number;
    assetData: string;
    assetType: string;
    assetFormat?: string | null | undefined;
};

export type UploadCharacterAsset$input = {
    input: UploadCharacterAssetInput;
};

export type UploadCharacterAsset$optimistic = {
    readonly uploadCharacterAsset?: {
        readonly id?: string;
        readonly characterId?: string;
        readonly assetType?: string;
        readonly assetFormat?: string | null;
        readonly createdAt?: string;
        readonly updatedAt?: string;
    };
};

export type UploadCharacterAsset$artifact = {
    "name": "UploadCharacterAsset";
    "kind": "HoudiniMutation";
    "hash": "d779411495022e161b7a66e36ee79fd72fb2e28a2dccc9a49bdd800691989e62";
    "raw": `mutation UploadCharacterAsset($input: UploadCharacterAssetInput!) {
  uploadCharacterAsset(input: $input) {
    id
    characterId
    assetType
    assetFormat
    createdAt
    updatedAt
  }
}`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "uploadCharacterAsset": {
                "type": "CharacterAsset";
                "keyRaw": "uploadCharacterAsset(input: $input)";
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
        };
    };
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "input": "UploadCharacterAssetInput";
        };
        "types": {
            "UploadCharacterAssetInput": {
                "characterId": "ID";
                "assetData": "String";
                "assetType": "String";
                "assetFormat": "String";
            };
        };
        "defaults": {};
        "runtimeScalars": {};
    };
};