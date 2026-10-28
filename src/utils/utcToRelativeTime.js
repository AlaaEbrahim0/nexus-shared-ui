import moment from "moment";
export function convertUtcToRelativeTime(utcDateTime) {
    let utcMoment = moment.utc(utcDateTime);

    let localDateTimeString = utcMoment.local().utc().format("DD MMM YYYY");

    return localDateTimeString;
}
