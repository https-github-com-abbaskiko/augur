import {
  ADD_VALIDATION_TO_NEW_MARKET,
  REMOVE_VALIDATION_FROM_NEW_MARKET,
  ADD_ORDER_TO_NEW_MARKET,
  REMOVE_ORDER_FROM_NEW_MARKET,
  UPDATE_NEW_MARKET,
  CLEAR_NEW_MARKET
} from 'modules/create-market/actions/update-new-market';

import { TAKER_FEE_DEFAULT, MAKER_FEE_DEFAULT } from 'modules/create-market/constants/new-market-constraints';

const DEFAULT_STATE = {
  validations: [],
  currentStep: 0,
  type: null,
  outcomes: [],
  description: '',
  expirySourceType: '',
  expirySource: '',
  endDate: {},
  detailsText: '',
  topic: '',
  keywords: [],
  takerFee: TAKER_FEE_DEFAULT,
  makerFee: MAKER_FEE_DEFAULT,
  orderBook: {}
};

export default function (newMarket = DEFAULT_STATE, action) {
  switch (action.type) {
    case ADD_VALIDATION_TO_NEW_MARKET: {
      if (newMarket.validations.indexOf(action.data) === -1) {
        return {
          ...newMarket,
          validations: [
            action.data,
            ...newMarket.validations
          ]
        };
      }
      return newMarket;
    }
    case REMOVE_VALIDATION_FROM_NEW_MARKET: {
      if (newMarket.validations.indexOf(action.data) !== -1) {
        return {
          ...newMarket,
          validations: [
            ...newMarket.validations.slice(0, newMarket.validations.indexOf(action.data)),
            ...newMarket.validations.slice(newMarket.validations.indexOf(action.data) + 1)
          ]
        };
      }
      return newMarket;
    }
    case ADD_ORDER_TO_NEW_MARKET: {
      const updatedOutcome = newMarket.orderBook[action.data.outcome] ?
        newMarket.orderBook[action.data.outcome].push({ type: action.data.type, price: action.data.price, quantity: action.data.quantity }) :
        newMarket.orderBook[action.data.outcome] = [{ type: action.data.type, price: action.data.price, quantity: action.data.quantity }];

      return {
        ...newMarket,
        orderBook: {
          ...newMarket.orderBook,
          [action.data.outcome]: updatedOutcome
        }
      };
    }
    case REMOVE_ORDER_FROM_NEW_MARKET: {
      const updatedOutcome = [
        ...newMarket.orderBook[action.data.outcome].slice(0, action.data.index),
        ...newMarket.orderBook[action.data.outcome].slice(action.data.index + 1)
      ];

      return {
        ...newMarket,
        orderBook: {
          ...newMarket.orderBook,
          [action.data.outcome]: updatedOutcome
        }
      };
    }
    case UPDATE_NEW_MARKET:
      return {
        ...newMarket,
        ...action.data
      };
    case CLEAR_NEW_MARKET:
      return {};
    default:
      return newMarket;
  }
}
