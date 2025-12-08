export type GenerateVideo = {
    readonly "input": GenerateVideo$input;
    readonly "result": GenerateVideo$result;
};

export type GenerateVideo$result = {
    readonly generateVideo: {
        readonly id: string;
        readonly storyboardId: string;
        readonly variationNumber: number;
        readonly status: string;
        readonly createdAt: string;
    };
};

export type GenerateVideo$input = {
    storyboardId: string;
};

export type GenerateVideo$optimistic = {
    readonly generateVideo?: {
        readonly id?: string;
        readonly storyboardId?: string;
        readonly variationNumber?: number;
        readonly status?: string;
        readonly createdAt?: string;
    };
};

export type GenerateVideo$artifact = {
    "name": "GenerateVideo";
    "kind": "HoudiniMutation";
    "hash": "258969b154ef9041e3bd2bfed991daf56fbcdef588127de42c90e0193d11e142";
    "raw": `mutation GenerateVideo($storyboardId: ID!) {
  generateVideo(storyboardId: $storyboardId) {
    id
    storyboardId
    variationNumber
    status
    createdAt
  }
}
`;
    "rootType": "Mutation";
    "stripVariables": [];
    "selection": {
        "fields": {
            "generateVideo": {
                "type": "VideoStatus";
                "keyRaw": "generateVideo(storyboardId: $storyboardId)";
                "selection": {
                    "fields": {
                        "id": {
                            "type": "ID";
                            "keyRaw": "id";
                            "visible": true;
                        };
                        "storyboardId": {
                            "type": "ID";
                            "keyRaw": "storyboardId";
                            "visible": true;
                        };
                        "variationNumber": {
                            "type": "Int";
                            "keyRaw": "variationNumber";
                            "visible": true;
                        };
                        "status": {
                            "type": "String";
                            "keyRaw": "status";
                            "visible": true;
                        };
                        "createdAt": {
                            "type": "String";
                            "keyRaw": "createdAt";
                            "visible": true;
                        };
                    };
                };
                "visible": true;
            };
        };
    };
    "pluginData": {};
    "input": {
        "fields": {
            "storyboardId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
};