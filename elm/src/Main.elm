module Main exposing (main)

import Browser
import Html exposing (Html, button, div, h2, input, textarea, text)
import Html.Attributes exposing (placeholder, readonly, rows, style, value)
import Html.Events exposing (onClick, onInput)
import Http
import Json.Decode as D
import Random


-- MODEL


type RemoteData e a
    = NotAsked
    | Loading
    | Failure e
    | Success a


type alias Model =
    { words : RemoteData Http.Error (List String)
    , pickedWord : Maybe String
    , defs : RemoteData Http.Error (List String)
    , answer : String
    , lastSubmitted : String
    }


init : () -> ( Model, Cmd Msg )
init _ =
    ( { words = Loading
      , pickedWord = Nothing
      , defs = NotAsked
      , answer = ""
      , lastSubmitted = ""
      }
    , fetchWords
    )



-- MSG


type Msg
    = GotWords (Result Http.Error String)
    | GotRandomIndex Int
    | GotDefinitions (Result Http.Error (List String))
    | AnswerChanged String
    | SubmitAnswer



-- WORD LIST (TXT)


wordsUrl : String
wordsUrl ="../static/thousand_words_things_explainer.txt"


fetchWords : Cmd Msg
fetchWords =
    Http.get
        { url = wordsUrl
        , expect = Http.expectString GotWords
        }


parseWords : String -> List String
parseWords content =
    content
        |> String.words
        |> List.filter (\w -> String.length w > 0)



-- DICTIONARY API


fetchDefinition : String -> Cmd Msg
fetchDefinition word =
    Http.get
        { url = "https://api.dictionaryapi.dev/api/v2/entries/en/" ++ word
        , expect = Http.expectJson GotDefinitions definitionsDecoder
        }


definitionsDecoder : D.Decoder (List String)
definitionsDecoder =
    D.list entryDecoder
        |> D.map List.concat


entryDecoder : D.Decoder (List String)
entryDecoder =
    D.field "meanings" (D.list meaningDecoder)
        |> D.map List.concat


meaningDecoder : D.Decoder (List String)
meaningDecoder =
    D.field "definitions" (D.list (D.field "definition" D.string))



-- UPDATE


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        GotWords result ->
            case result of
                Ok content ->
                    let
                        ws =
                            parseWords content

                        maxIndex =
                            List.length ws - 1
                    in
                    if maxIndex < 0 then
                        ( { model | words = Success [] }, Cmd.none )

                    else
                        ( { model | words = Success ws }
                        , Random.generate GotRandomIndex (Random.int 0 maxIndex)
                        )

                Err e ->
                    ( { model | words = Failure e }, Cmd.none )

        GotRandomIndex i ->
            case model.words of
                Success ws ->
                    let
                        w =
                            List.drop i ws |> List.head
                    in
                    case w of
                        Nothing ->
                            ( model, Cmd.none )

                        Just word ->
                            ( { model
                                | pickedWord = Just word
                                , defs = Loading
                              }
                            , fetchDefinition word
                            )

                _ ->
                    ( model, Cmd.none )

        GotDefinitions result ->
            case result of
                Ok ds ->
                    ( { model | defs = Success ds }, Cmd.none )

                Err e ->
                    ( { model | defs = Failure e }, Cmd.none )

        AnswerChanged s ->
            ( { model | answer = s }, Cmd.none )

        SubmitAnswer ->
            ( { model | lastSubmitted = model.answer }, Cmd.none )



-- VIEW


view : Model -> Html Msg
view model =
    div []
        [ h2 [] [ text ("Word: " ++ (model.pickedWord |> Maybe.withDefault "...")) ]
        , h2 [] [ text "Definition:" ]
        , textarea
            [ value (definitionText model.defs)
            , readonly True
            , rows 10
            ]
            []
        , div [ style "margin-top" "16px" ]
            [ h2 [] [ text "Your answer:" ]
            , input
                [ placeholder "Write your answer here"
                , value model.answer
                , onInput AnswerChanged
                , style "box-sizing" "border-box"
                , style "padding" "12px"
                ]
                []
            , button
                [ onClick SubmitAnswer
                , style "margin" "15px 20px 15px 20px"
                , style "background-color" "#333"
                ]
                [ text "Validate" ]
            , div [ style "margin-top" "12px" ]
                [ text ("Last submitted answer: " ++ model.lastSubmitted) ]
            ]
        ]


definitionText : RemoteData Http.Error (List String) -> String
definitionText defs =
    case defs of
        NotAsked ->
            "..."

        Loading ->
            "Loading definition..."

        Failure _ ->
            "Error while fetching definition (word not found or API error)."

        Success ds ->
            if List.isEmpty ds then
                "No definition found."

            else
                ds
                    |> List.indexedMap (\i d -> String.fromInt (i + 1) ++ ". " ++ d)
                    |> String.join "\n"



-- SUBSCRIPTIONS


subscriptions : Model -> Sub Msg
subscriptions _ =
    Sub.none



-- MAIN


main : Program () Model Msg
main =
    Browser.element
        { init = init
        , update = update
        , view = view
        , subscriptions = subscriptions
        }
