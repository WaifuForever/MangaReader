import User from '../models/user.model.js';

import { TEST_E2E_ENV } from '../utils/constant.util.js';
import jwt from '../utils/jwt.util.js';
import { encrypt } from '../utils/password.util.js';

function auth(roles = []) {
    return async (req, res, next) => {
        try {
            const [, token] = req.headers.authorization
                ? req.headers.authorization.split(' ')
                : [, ''];
            if (typeof roles === 'string') {
                roles = [roles];
            }
            let payload = null;
            try {
                payload = jwt.verifyJwt(token, 1);
            } catch (err) {
                //Invalid Token
                return res.jsonUnauthorized(err, null, null);
            }

            if (roles.length && !roles.includes(payload.role)) {
                //Invalid roles
                return res.jsonUnauthorized(null, null, null);
            } else {
                if (process.env.NODE_ENV === TEST_E2E_ENV) {
                    req.auth = encrypt(payload._id);
                    next();
                } else {
                    User.exists({
                        _id: payload._id,
                        active: true,
                        token_version: payload.token_version,
                    })
                        .then(result => {
                            if (result) {
                                try {
                                    var current_time =
                                        Date.now().valueOf() / 1000;
                                    if (
                                        (payload.exp - payload.iat) / 2 >
                                        payload.exp - current_time
                                    ) {
                                        let new_token = jwt.generateJwt(
                                            {
                                                id: payload._id,
                                                role: payload.role,
                                                token_version:
                                                    payload.token_version,
                                            },
                                            1,
                                        );
                                        req.new_token = `Bearer ${new_token}`;
                                        console.log(`New Token: ${new_token}`);
                                    } else {
                                        console.log('Token not expired');
                                    }

                                    req.auth = encrypt(payload._id);
                                    payload = null;
                                    next();
                                } catch (err) {
                                    console.log(err);
                                    //Server error
                                    return res.jsonServerError(
                                        null,
                                        null,
                                        null,
                                    );
                                }
                            } else {
                                return res.jsonUnauthorized(null, null, null);
                            }
                        })
                        .catch(err => {
                            return res.jsonUnauthorized(null, null, err);
                        });
                }
            }
        } catch (err) {
            console.log(err);
            return res.jsonUnauthorized(null, null, err);
        }
    };
}

function easyAuth() {
    return async (req, res, next) => {
        try {
            if (!req.headers.authorization) {
                next();
            } else {
                const [, token] = req.headers.authorization.split(' ');

                if (!token) {
                    next();
                } else {
                    let payload = null;

                    payload = jwt.verifyJwt(token, 1);
                    if (process.env.NODE_ENV === TEST_E2E_ENV) {
                        req.auth = encrypt(payload._id);
                        next();
                    } else {
                        User.exists({
                            _id: payload._id,
                            active: true,
                            token_version: payload.token_version,
                        })
                            .then(result => {
                                if (result) {
                                    try {
                                        var current_time =
                                            Date.now().valueOf() / 1000;
                                        console.log(payload);
                                        console.log(payload.exp - payload.iat);
                                        console.log(payload.exp - current_time);
                                        console.log(current_time);
                                        if (
                                            (payload.exp - payload.iat) / 2 >
                                            payload.exp - current_time
                                        ) {
                                            let new_token = jwt.generateJwt(
                                                {
                                                    id: payload._id,
                                                    role: payload.role,
                                                    token_version:
                                                        payload.token_version,
                                                },
                                                1,
                                            );
                                            req.new_token = `Bearer ${new_token}`;
                                            console.log(
                                                `New Token: ${new_token}`,
                                            );
                                        } else {
                                            console.log('Token not expired');
                                        }
                                        let dict = {
                                            '': 0,
                                            Scan: 1,
                                            User: 2,
                                        };

                                        req.role = CryptoJs.AES.encrypt(
                                            dict[payload.role].toString(),
                                            `${process.env.SHUFFLE_SECRET}`,
                                        );
                                        payload = null;
                                        dict = null;
                                        next();
                                    } catch (err) {
                                        console.log('something went wrong.');
                                        console.log(err);
                                        next();
                                    }
                                } else {
                                    next();
                                }
                            })
                            .catch(err => {
                                next();
                            });
                    }
                }
            }
        } catch (err) {
            next();
        }
    };
}

export { auth, easyAuth };
