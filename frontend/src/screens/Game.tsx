import { useEffect, useState } from 'react'
import Button from '../components/Button'
import { ChessBoard } from '../components/ChessBoard'
import { useSocket } from '../hooks/useSocket'

// TODO: Move together, there's code repetition here
export const INIT_GAME = "init_game"
export const MOVE = "move"
export const GAME_OVER = "game_over"

export const Game = () => {
  const socket = useSocket()
  const [board, setBoard] = useState()

  useEffect(() => {
    if(!socket) {
      return
    }
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log("Received message from server:", message)
      switch(message.type){
        case INIT_GAME:
          console.log("Game initialized")
          break
        case MOVE:
          console.log("Move received:", message.move)
          break
        case GAME_OVER:
          console.log("Game over:", message.result)
          break
      }
    }
  }, [socket])

  if(!socket){
    return <div>Connecting to server...</div>
  }
  return(
    <div className="flex justify-center">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4 bg-red-200 w-full">
            <ChessBoard />
          </div>
          <div className="col-span-2 bg-green-200 w-full">
            <Button onClick={()=>{
              socket.send(JSON.stringify({
                type: INIT_GAME,


              }))
            }}>
              Play
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
