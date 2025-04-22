const {Booking} = require('../models')
const { Op } = require('sequelize');
const CrudRepository = require('./crud-repository')
const {Enums} = require('../utils/common')
const {BOOKED, CANCELLED} = Enums.BOOKING_STATUS
class BookingRepository extends CrudRepository{
    constructor(){
        super(Booking)
    }
    async createBooking(data,transaction){
        const response = await Booking.create(data, {transaction: transaction});
        return response;
    }
    async get(id, transaction) {
        const response = await this.model.findByPk(id, {transaction: transaction});
        if(!response){
            throw new AppError('Airplane not found',StatusCodes.NOT_FOUND)
        }
        return response;
      }
      async update(id, data, transaction) {
        const response = await this.model.update(data, {
          where: {
            id: id,
          },
        }, {transaction: transaction});
        return response;
      }
      async cancelOldBookings(timestamp){
        const response = await Booking.update(
          {status: CANCELLED}
          ,{
          where: {
            [Op.and]: [
              {
                createdAt: {
                [Op.lt]: timestamp
                }
              },
              {
                status: {
                  [Op.ne]: BOOKED
                }
              },
              {
                status: {
                  [Op.ne]: CANCELLED
                }
              }
            ]
            
          }
        })
        return response
      }
}
module.exports = BookingRepository;