import * as Knex from "knex";

exports.seed = function (knex: Knex): Promise<any> {
    // Deletes ALL existing entries
    return knex("profit_loss_timeseries").del()
        .then(function () {
            // Inserts seed entries
            return knex("profit_loss_timeseries").insert([
                { id: 1, colName: "rowValue1" },
                { id: 2, colName: "rowValue2" },
                { id: 3, colName: "rowValue3" }
            ]);
        });
};
