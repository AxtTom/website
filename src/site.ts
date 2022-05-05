import * as express from "express"


export interface Site {
    name: string,
    path: string,
    hideInList?: boolean,
    render: (req, res) => string | Promise<string>
}