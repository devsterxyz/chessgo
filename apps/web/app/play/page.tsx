import { ChessBoard } from "@repo/ui/ChessBoard";
import { Button } from "@repo/ui/Button"

export default function Play(){
  return(
    <div className="flex justify-center">
      <div className="pt-8 max-w-screen-lg w-full">
        <div className="grid grid-cols-6 gap-4 w-full">
          <div className="col-span-4  w-full flex justify-center">
            <ChessBoard />
          </div>
          <div className="col-span-2 bg-slate-800 w-full flex justify-center">
            <div className='pt-8'>
              <Button>
                Play
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}