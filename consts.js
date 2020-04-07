/*
 * consts.js of pp-interrupter
 *
 * Time-stamp: <2017-12-07T05:48:37Z>
 */

const PP_AUTHORIZER_ID = "{783dadb1-a4ec-46e7-a6de-26432b3393c2}";

const INIT_SETTINGS = {
  authorities: [],
//  authorities: [
//    {name: "Twitter", url: "https://api.twitter.com/oauth/authorize"},
//    {name: "Hatena", url: "https://www.hatena.com/oauth/authorize"}
//  ],
  extensions: [
    {name: "PP Authorizer", id: PP_AUTHORIZER_ID}
  ]
};
