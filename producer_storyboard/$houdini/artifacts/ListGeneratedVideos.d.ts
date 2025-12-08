export type ListGeneratedVideos = {
    readonly "input": ListGeneratedVideos$input;
    readonly "result": ListGeneratedVideos$result | undefined;
};

export type ListGeneratedVideos$result = {
    readonly generatedVideos: ({
        readonly id: string;
        readonly storyboardId: string;
        readonly variationNumber: number;
        readonly videoUrl: string | null;
        readonly status: string;
        readonly errorMessage: string | null;
        readonly createdAt: string;
    })[];
};

export type ListGeneratedVideos$input = {
    storyboardId: string;
};

export type ListGeneratedVideos$artifact = {
    "name": "ListGeneratedVideos";
    "kind": "HoudiniQuery";
    "hash": "e8fc4e084925f66f440b710693d01312d25ea576c3f93a2491b1549052b35cd0";
    "raw": `query ListGeneratedVideos($storyboardId: ID!) {
  generatedVideos(storyboardId: $storyboardId) {
    id
    storyboardId
    variationNumber
    videoUrl
    status
    errorMessage
    createdAt
  }
}
`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "generatedVideos": {
                "type": "VideoStatus";
                "keyRaw": "generatedVideos(storyboardId: $storyboardId)";
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
                        "videoUrl": {
                            "type": "String";
                            "keyRaw": "videoUrl";
                            "nullable": true;
                            "visible": true;
                        };
                        "status": {
                            "type": "String";
                            "keyRaw": "status";
                            "visible": true;
                        };
                        "errorMessage": {
                            "type": "String";
                            "keyRaw": "errorMessage";
                            "nullable": true;
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
    "pluginData": {
        "houdini-svelte": {};
    };
    "input": {
        "fields": {
            "storyboardId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
    "policy": "CacheOrNetwork";
    "partial": false;
};