import React, { useCallback, useEffect, useState } from 'react';
import * as jose from 'jose';
import { ChartComponent as Chart } from './Chart';
import { formatTime } from '@/modules/utils';
import styled from 'styled-components';

interface Message {
  // Define the structure of your message
  // This is an example; adjust according to the actual message structure you expect
  payload: any;
  channel: string;
}

export interface Trade {
  // Define the structure of your message
  // This is an example; adjust according to the actual message structure you expect
  txn_version: number,
  event_idx: number,
  emit_address: string,
  time: Date,
  maker_address: string,
  maker_custodian_id: number,
  maker_order_id: number,
  maker_side: boolean,
  market_id: number,
  price: number,
  sequence_number_for_trade: number,
  size: number,
  taker_address: string,
  taker_custodian_id: number,
  taker_order_id: number,
  taker_quote_fees_paid: number,
}

export type Candlestick = {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
};

const GREATER_THAN = 1;
const LESS_THAN = -1;
const EQUAL = 0;
const CANDLESTICK_TIMEFRAME = 60; // seconds

function compareTrades(a: Trade, b: Trade) {
  if (a.time.getTime() == b.time.getTime()) {
    return EQUAL;
  }
  if (a.time.getTime() < b.time.getTime()) {
    return LESS_THAN;
  }
  return GREATER_THAN;
}

function getCandlestickPeriodStart(time: Date, periodInSeconds: number): Date {
  const timeInSeconds = Math.floor(time.getTime() / 1000);
  const roundedTimeInSeconds = timeInSeconds - (timeInSeconds % periodInSeconds);
  return new Date(roundedTimeInSeconds * 1000);
}

const WebSocketDemo: React.FC = (props: any) => {
  const [token, setToken] = useState<string>("");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [txnSet, setTxnSet] = useState<Set<number>>(new Set<number>()); // Set of txn_version's of trades in trades
  const [candlesticks, setCandlesticks] = useState<Candlestick[]>([]); // time, open, high, low, close

  const [tradeData, setTradeData] = useState({ txnSet: new Set<number>(), trades: new Array<Trade>() });

  const handleNewTrade = (trade: Trade) => {
    setTradeData((prevData) => {
      // Check if the trade's txn_version is already in the set
      if (prevData.txnSet.has(trade.txn_version)) {
        // It's a duplicate, so we don't need to update the state
        return prevData;
      }

      // It's not a duplicate, so proceed with updating
      // First, create a new Set from the previous Set and add the new txn_version
      const newTxnSet = new Set(prevData.txnSet).add(trade.txn_version);

      // Then, add the new trade to the trades array and sort it
      // Note: Ensure your compareTrades function doesn't rely on mutable state outside its scope
      const newTrades = [...prevData.trades, trade].sort(compareTrades);

      // Return the updated state with both the new set and the updated trades array
      return { txnSet: newTxnSet, trades: newTrades };
    });
    setCandlesticks((prevcandlesticks) => {
      const lastCandleStick = prevcandlesticks[prevcandlesticks.length - 1];

      if (!lastCandleStick) {
        return [{
          time: getCandlestickPeriodStart(trade.time, CANDLESTICK_TIMEFRAME),
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
        }];
      } else {
        // candlestick exists, now we check to see if the trade fits in the current candlestick
        if (getCandlestickPeriodStart(trade.time, CANDLESTICK_TIMEFRAME).getTime() === lastCandleStick.time.getTime()) {
          lastCandleStick.close = trade.price;
          lastCandleStick.high = Math.max(lastCandleStick.high, trade.price);
          lastCandleStick.low = Math.min(lastCandleStick.low, trade.price);
          return [...prevcandlesticks.slice(0, prevcandlesticks.length - 1), lastCandleStick];
        } else {
          // trade is outside of the current candlestick, so we need to create a new one
          return [...prevcandlesticks, {
            time: getCandlestickPeriodStart(trade.time, CANDLESTICK_TIMEFRAME),
            open: lastCandleStick.close,
            high: trade.price,
            low: trade.price,
            close: trade.price,
          }];
        }
      }
    });
  };

  // Use this function to handle incoming trades


  // Encode the JWT token
  // NOTE: This is a simple example; should probably generate the token server-side
  const generateAndSetToken = useCallback(async (): Promise<string> => {
    const payload = {
      mode: 'r',
      channels: [
        "market_registration_event",
        "place_limit_order_event",
        "place_market_order_event",
        "place_swap_order_event",
        "fill_event",
        "change_order_size_event",
        "cancel_order_event",
        "recognized_market_event",
        "new_limit_order",
        "updated_limit_order",
        "new_market_order",
        "new_swap_order",
      ],
    };
    const secretKey = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET_KEY!);
    const token = await new jose.SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(secretKey);
    setToken(token);
    return token;
  }, [setToken]);

  useEffect(() => {
    generateAndSetToken();
  }, [generateAndSetToken]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const websocketURL = `ws://localhost:3001/${token}`;
    const ws = new WebSocket(websocketURL);

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const trade: Trade = {
          ...message.payload,
          time: new Date(message.payload.time),
        };
        // technically this is incorrect, as a single TXN could have multiple trades in it. You would need to keep track of all the events and the trades occurring from them
        if (message.channel == "fill_event") {
          handleNewTrade(trade);
        }
      } catch (error) {
        console.error('Error parsing message', error);
      }
    };

    // ws.onopen = () => { console.log('WebSocket Connected'); };
    // ws.onerror = (error: Event) => { console.error('WebSocket Error: ', error); };
    // ws.onclose = () => { console.log('WebSocket Disconnected'); };
    return () => {
      // Only close the WebSocket in cleanup if it's open
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [generateAndSetToken, token, txnSet, trades, setTxnSet, setTrades]);


  return (
    <div>
      <div style={{ display: "flex", width: "80vw", margin: "auto", }}>
        <div style={{ display: "flex", flexDirection: "column", minWidth: "400px", width: "50vw", maxWidth: "90vh", margin: "50px", }}>
          <h2 style={{ marginBottom: '10px', textAlign: "center", }}>eAPT / eUSDC</h2>
          <Chart {...props} data={candlesticks}> </Chart>
        </div>
        <div style={{ minWidth: "440px", margin: "50px", marginTop: "85px", padding: "1ch", background: "rgb(11, 11, 11)", border: "1px solid grey", height: '900px', scrollBehavior: "smooth", overflowY: "scroll", }}>
          <div style={{ display: "flex", }}>
            <TradeDataHeader>Amount</TradeDataHeader>
            <TradeDataHeader>Price</TradeDataHeader>
            <TradeDataHeader>Time</TradeDataHeader>
            <TradeDataHeader>Version</TradeDataHeader>
          </div>
          {tradeData.trades.map((trade, index) => (
            <TradeData key={index} >
              <ColumnData style={{ width: "100px", padding: "10px", paddingTop: "4px", paddingBottom: "3px", }}>{trade.size}</ColumnData>
              <ColumnData style={{ width: "100px", color: trade.maker_side ? "red" : "rgb(0, 221, 31)", padding: "10px", paddingTop: "4px", paddingBottom: "3px", }}>{trade.price}</ColumnData>
              <ColumnData style={{ width: "100px", padding: "10px", paddingTop: "4px", paddingBottom: "3px", }}>{`${formatTime(trade.time)}`}</ColumnData>
              <ColumnData style={{ width: "100px", padding: "10px", paddingTop: "4px", paddingBottom: "3px", }}>{`${trade.txn_version}`}</ColumnData>
            </TradeData>
          )).reverse()}
        </div>
      </div>
    </div>
  );
};

const TradeDataHeader = styled.div`
  width: 100px;
  color: lightgrey;
  font-weight: 800;
  padding: 10px;
`;

const TradeData = styled.div`
  display: flex;
  border: 1px solid #00000000;

  &:hover {
    // border: 1px solid #2962FF;
    background-color: #111111;
  }
`;

const ColumnData = styled.div`
  display: flex;
  width: 100%;
  padding: 10px;
  padding-top: 4px;
  padding-bottom: 3px
`;

export default WebSocketDemo;
