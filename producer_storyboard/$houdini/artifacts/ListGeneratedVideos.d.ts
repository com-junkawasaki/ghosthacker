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
    storyboardId: string | number;
};

export type ListGeneratedVideos$artifact = {
    "name": "ListGeneratedVideos";
    "kind": "HoudiniQuery";
    "hash": "d238c8b099c21229d1990f30bb53e3cb251f014a93c653acaf1480b123a99b38";
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
}`;
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