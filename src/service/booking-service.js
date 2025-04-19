const axios = require("axios");
const { ServerConfig } = require("../config");

const { BookingRepository } = require("../repositories");
const db = require("../models");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");

async function createBooking(data) {
    try {
      const result = await db.sequelize.transaction(async (t) => {
        const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
        
        if (data.noOfSeats > flight.data.data.totalSeats) {
          throw new AppError("Not enough seats available", StatusCodes.BAD_REQUEST);
        }
        return true; // Or return booking
      });
  
      return result;
    } catch (error) {
      throw error;
    }
  }
  

module.exports = {
  createBooking,
};
