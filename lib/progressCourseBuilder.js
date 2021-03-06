'use strict';

const utils = require('../lib/utils');
const commonBuilder = require('../lib/commonBuilder');

module.exports = {

    buildFreeExpression: function (target, arr) {
        arr.push('<mmlPc:FreeExpression>');
        arr.push(target.value);
        if (target.hasOwnProperty('extRef')) {
            target.extRef.forEach((entry) => {
                commonBuilder.buildExtRef(entry);
            });
        }
        arr.push('</mmlPc:FreeExpression>');
    },

    build: function (target, arr) {
        arr.push('<mmlPc:ProgressCourseModule>');

        this.buildFreeExpression(target.freeExpression, arr);

        arr.push('</mmlPc:ProgressCourseModule>');
    }
};
