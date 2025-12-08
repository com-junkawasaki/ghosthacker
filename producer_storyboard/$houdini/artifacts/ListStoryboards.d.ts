export type ListStoryboards = {
    readonly "input": ListStoryboards$input;
    readonly "result": ListStoryboards$result | undefined;
};

export type ListStoryboards$result = {
    readonly storyboards: ({
        readonly id: string;
        readonly projectId: string;
        readonly title: string;
        readonly aspectRatio: string;
        readonly resolution: string;
        readonly durationSeconds: number | null;
        readonly numVariations: number;
        readonly createdAt: string;
        readonly updatedAt: string;
    })[];
};

export type ListStoryboards$input = {
    projectId: string;
};

export type ListStoryboards$artifact = {
    "name": "ListStoryboards";
    "kind": "HoudiniQuery";
    "hash": "657f6ed5820df749ab3c51bc7c1bde1013ec52b543c1b9792021e411dfa4945b";
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
}
`;
    "rootType": "Query";
    "stripVariables": [];
    "selection": {
        "fields": {
            "storyboards": {
                "type": "Storyboard";
                "keyRaw": "storyboards(projectId: $projectId)";
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
                        "title": {
                            "type": "String";
                            "keyRaw": "title";
                            "visible": true;
                        };
                        "aspectRatio": {
                            "type": "String";
                            "keyRaw": "aspectRatio";
                            "visible": true;
                        };
                        "resolution": {
                            "type": "String";
                            "keyRaw": "resolution";
                            "visible": true;
                        };
                        "durationSeconds": {
                            "type": "Int";
                            "keyRaw": "durationSeconds";
                            "nullable": true;
                            "visible": true;
                        };
                        "numVariations": {
                            "type": "Int";
                            "keyRaw": "numVariations";
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
    "pluginData": {};
    "input": {
        "fields": {
            "projectId": "ID";
        };
        "types": {};
        "defaults": {};
        "runtimeScalars": {};
    };
    "policy": "CacheOrNetwork";
    "partial": false;
};