const axios = require("axios");
const { ServerConfig } = require("../config");
const {Enums} = require('../utils/common')
const {BOOKED, CANCELLED} = Enums.BOOKING_STATUS

const { BookingRepository } = require("../repositories");
const db = require("../models");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/errors/app-error");

const bookingRepository = new BookingRepository();

async function createBooking(data) {
    const transaction = await db.sequelize.transaction();
    try {
        const flight = await axios.get(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}`);
        
        const flightData = flight.data.data
        if (data.noOfSeats > flightData.totalSeats) {
          throw new AppError("Not enough seats available", StatusCodes.BAD_REQUEST);
        }
        const totalBillingAmount = data.noOfSeats * flightData.price
        
        const bookingPayload = {
          ...data, totalCost: totalBillingAmount
        }
        const booking = await bookingRepository.createBooking(bookingPayload, transaction)

        await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${data.flightId}/seats`,{
          seats: data.noOfSeats
        })

        await transaction.commit();
        return booking; // Or return booking
    } catch (error) {
      await transaction.rollback();
      throw error
    }
  }

  async function makePayment(data){
    const transaction = await db.sequelize.transaction();
    try {
      const bookingDetails = await bookingRepository.get(data.bookingId,transaction);
      if(bookingDetails.status == CANCELLED){
        throw new AppError('Amount of payment doesnt match', StatusCodes.BAD_REQUEST)
      }
      const bookingTime = new Date(bookingDetails.createdAt);
      const currTime = new Date();
      if(currTime - bookingTime > 300000){
        await cancelBooking(data.bookingId)
        throw new AppError('Booking has expired', StatusCodes.BAD_REQUEST)
      }
      if(bookingDetails.totalCost != data.totalCost){
        throw new AppError('Amount of payment doesnt match', StatusCodes.BAD_REQUEST)
      }
      if(bookingDetails.userId != data.userId){
        throw new AppError('User corresponding to booking doesnt match', StatusCodes.BAD_REQUEST)
      }
      const response = await bookingRepository.update(data.bookingId, {status: BOOKED}, transaction)
      await transaction.commit();
    } catch (error) {
      console.log(error)
      await transaction.rollback();
      throw error;

    }
  }
  
  async function cancelBooking(bookingId){
    const transaction = await db.sequelize.transaction();
    try {
      const bookingDetails = await bookingRepository.get(bookingId, transaction);
      if(bookingDetails.status == CANCELLED){
        transaction.commit();
        return true;
      }
      await axios.patch(`${ServerConfig.FLIGHT_SERVICE}/api/v1/flights/${bookingDetails.flightId}/seats`,{
        seats: bookingDetails.noOfSeats,
        dec: 0
      })
      await bookingRepository.update(bookingId, {status: CANCELLED}, transaction)
      await transaction.commit()
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async function cancelOldBookings(){
    try {
      const time = new Date(Date.now() - 1000*300);
      const response = await bookingRepository.cancelOldBookings(time)
      return response
    } catch (error) {
      
    }
  }

module.exports = {
  createBooking,
  makePayment,
  cancelBooking,
  cancelOldBookings
};
